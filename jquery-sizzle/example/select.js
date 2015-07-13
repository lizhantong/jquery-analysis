/**
 * Created by lizhantong on 15/6/25.
 */
//引擎的主要入口函数
function select(selector, context, results, seed) {
    var i, tokens, token, type, find,
    //解析出词法格式
        match = tokenize(selector);

    if (!seed) { //如果外界没有指定初始集合seed了。
        // Try to minimize operations if there is only one group
        // 没有多组的情况下
        // 如果只是单个选择器的情况，也即是没有逗号的情况：div, p，可以特殊优化一下
        if (match.length === 1) {

            // Take a shortcut and set the context if the root selector is an ID
            tokens = match[0] = match[0].slice(0); //取出选择器Token序列

            //如果第一个是selector是id我们可以设置context快速查找
            if (tokens.length > 2 && (token = tokens[0]).type === "ID" &&
                support.getById && context.nodeType === 9 && documentIsHTML &&
                Expr.relative[tokens[1].type]) {

                context = (Expr.find["ID"](token.matches[0].replace(runescape, funescape), context) || [])[0];
                if (!context) {
                    //如果context这个元素（selector第一个id选择器）都不存在就不用查找了
                    return results;
                }
                //去掉第一个id选择器
                selector = selector.slice(tokens.shift().value.length);
            }

            // Fetch a seed set for right-to-left matching
            //其中： "needsContext"= new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
            //即是表示如果没有一些结构伪类，这些是需要用另一种方式过滤，在之后文章再详细剖析。
            //那么就从最后一条规则开始，先找出seed集合
            i = matchExpr["needsContext"].test(selector) ? 0 : tokens.length;

            //从右向左边查询
            while (i--) { //从后开始向前找！
                token = tokens[i]; //找到后边的规则

                // Abort if we hit a combinator
                // 如果遇到了关系选择器中止
                //
                //  > + ~ 空
                //
                if (Expr.relative[(type = token.type)]) {
                    break;
                }

                /*
                 先看看有没有搜索器find，搜索器就是浏览器一些原生的取DOM接口，简单的表述就是以下对象了
                 Expr.find = {
                 'ID'    : context.getElementById,
                 'CLASS' : context.getElementsByClassName,
                 'TAG'   : context.getElementsByTagName
                 }
                 */
                //如果是:first-child这类伪类就没有对应的搜索器了，此时会向前提取前一条规则token
                if ((find = Expr.find[type])) {

                    // Search, expanding context for leading sibling combinators
                    // 尝试一下能否通过这个搜索器搜到符合条件的初始集合seed
                    if ((seed = find(
                            token.matches[0].replace(runescape, funescape),
                            rsibling.test(tokens[0].type) && context.parentNode || context
                        ))) {

                        //如果真的搜到了
                        // If seed is empty or no tokens remain, we can return early
                        //把最后一条规则去除掉
                        tokens.splice(i, 1);
                        selector = seed.length && toSelector(tokens);

                        //看看当前剩余的选择器是否为空
                        if (!selector) {
                            //是的话，提前返回结果了。
                            push.apply(results, seed);
                            return results;
                        }

                        //已经找到了符合条件的seed集合，此时前边还有其他规则，跳出去
                        break;
                    }
                }
            }
        }
    }


    // "div > p + div.aaron [type="checkbox"]"

    // Compile and execute a filtering function
    // Provide `match` to avoid retokenization if we modified the selector above
    // 交由compile来生成一个称为终极匹配器
    // 通过这个匹配器过滤seed，把符合条件的结果放到results里边
    //
    //    //生成编译函数
    //  var superMatcher =   compile( selector, match )
    //
    //  //执行
    //    superMatcher(seed,context,!documentIsHTML,results,rsibling.test( selector ))
    //
    compile(selector, match)(
        seed,
        context, !documentIsHTML,
        results,
        rsibling.test(selector)
    );
    return results;
}